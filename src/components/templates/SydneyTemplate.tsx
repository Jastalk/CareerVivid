import React from 'react';
import { ResumeData, TemplateProps } from '../../types';
import InlineEdit from '../InlineEdit';
import { safeUrl } from '../../utils/safeUrl';
import IconDisplay from '../IconDisplay';
import { inkOn, readableAccent, readableBorder } from '../../utils/templateInk';

export const SydneyTemplate: React.FC<TemplateProps> = ({ resume, themeColor, titleFont, bodyFont, onFocus }) => {
  const { personalDetails, professionalSummary, employmentHistory, education, skills, websites, sectionTitles, customIcons } = resume;

  const titleStyle = { fontFamily: `'${titleFont}', sans-serif` };
  const bodyStyle = { fontFamily: `'${bodyFont}', sans-serif` };

  return (
    <div className="flex min-h-full bg-white" style={bodyStyle}>
      <aside className="w-1/3 bg-gray-800 text-white p-8">
        {personalDetails.photo && (
          <div className="w-32 h-32 rounded-full mx-auto mb-6 border-4 border-gray-600 overflow-hidden flex items-center justify-center">
            <img src={personalDetails.photo} alt="Profile" className="w-full h-full object-cover" />
          </div>
        )}
        <section className="mb-8">
          <h2 className="text-xl font-bold border-b-2 pb-2 mb-4 uppercase" style={{...titleStyle, borderColor: readableBorder(themeColor) }}>
             <InlineEdit value={sectionTitles?.contact || 'Contact'} fieldId="sectionTitles.contact" onFocus={onFocus} placeholder="Contact" />
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center">
                <IconDisplay iconName={customIcons?.email || 'mail'} size={16} className="mr-3 flex-shrink-0 transform translate-y-px" />
                <InlineEdit value={personalDetails.email} fieldId="personalDetails.email" onFocus={onFocus} placeholder="Email" />
            </div>
            <div className="flex items-center">
                <IconDisplay iconName={customIcons?.phone || 'phone'} size={16} className="mr-3 flex-shrink-0 transform translate-y-px" />
                <InlineEdit value={personalDetails.phone} fieldId="personalDetails.phone" onFocus={onFocus} placeholder="Phone" />
            </div>
            <div className="flex items-center">
                <IconDisplay iconName={customIcons?.location || 'map-pin'} size={16} className="mr-3 flex-shrink-0 transform translate-y-px" />
                <InlineEdit 
                    value={`${personalDetails.address}${personalDetails.city ? `, ${personalDetails.city}` : ''}`} 
                    fieldId="personalDetails.address" 
                    onFocus={onFocus} 
                    placeholder="Address" 
                />
            </div>
            {websites.map((site, index) => (
              <div key={site.id} className="flex items-center">
                  <IconDisplay iconName={site.icon || 'globe'} size={16} className="mr-3 flex-shrink-0 transform translate-y-px" />
                  <a href={safeUrl(site.url)} target="_blank" rel="noopener noreferrer" className="hover:text-primary-400 break-all" style={{color: readableAccent(themeColor, '#1f2937')}}>
                      <InlineEdit value={site.label} fieldId={`websites[${index}].label`} onFocus={onFocus} isLink />
                  </a>
              </div>
            ))}
          </div>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xl font-bold border-b-2 pb-2 mb-4 uppercase" style={{...titleStyle, borderColor: readableBorder(themeColor)}}>
            <InlineEdit value={sectionTitles?.skills || 'Skills'} fieldId="sectionTitles.skills" onFocus={onFocus} placeholder="Skills" />
          </h2>
          <ul className="space-y-2">
            {skills.map((skill, index) => (
              <li key={skill.id}>
                <InlineEdit 
                    value={skill.name} 
                    fieldId={`skills[${index}].name`} 
                    onFocus={onFocus} 
                    className="text-sm font-medium block"
                    placeholder="Skill Name"
                />
                <div className="w-full bg-gray-600 rounded-full h-2 mt-1">
                  <div className="h-2 rounded-full" style={{ width: `${{ Novice: '25%', Intermediate: '50%', Advanced: '75%', Expert: '100%' }[skill.level]}`, backgroundColor: themeColor, color: inkOn(themeColor) }}></div>
                </div>
              </li>
            ))}
          </ul>
        </section>
        
        <section>
          <h2 className="text-xl font-bold border-b-2 pb-2 mb-4 uppercase" style={{...titleStyle, borderColor: readableBorder(themeColor)}}>
            <InlineEdit value={sectionTitles?.education || 'Education'} fieldId="sectionTitles.education" onFocus={onFocus} placeholder="Education" />
          </h2>
          {education.map((edu, index) => (
            <div key={edu.id} className="mb-4 text-sm" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <InlineEdit 
                value={edu.degree} 
                fieldId={`education[${index}].degree`} 
                onFocus={onFocus} 
                className="font-bold block"
                style={titleStyle}
                tagName="h3"
                placeholder="Degree"
              />
              <InlineEdit 
                value={edu.school} 
                fieldId={`education[${index}].school`} 
                onFocus={onFocus} 
                className="text-gray-300 block"
                tagName="p"
                placeholder="School"
              />
              <div className="flex gap-1 text-gray-300 text-xs">
                  <InlineEdit value={edu.startDate} fieldId={`education[${index}].startDate`} onFocus={onFocus} placeholder="Start" />
                  <span>-</span>
                  <InlineEdit value={edu.endDate} fieldId={`education[${index}].endDate`} onFocus={onFocus} placeholder="End" />
              </div>
            </div>
          ))}
        </section>
      </aside>

      <main className="w-2/3 p-10">
        <header className="mb-10">
          <InlineEdit 
            value={personalDetails.firstName} 
            fieldId="personalDetails.firstName" 
            onFocus={onFocus} 
            className="text-5xl font-extrabold text-gray-800 block" 
            style={titleStyle}
            tagName="h1"
            placeholder="First Name"
          />
          <InlineEdit 
            value={personalDetails.lastName} 
            fieldId="personalDetails.lastName" 
            onFocus={onFocus} 
            className="text-5xl font-extrabold text-gray-800 block" 
            style={titleStyle}
            tagName="h1"
            placeholder="Last Name"
          />
          <InlineEdit 
            value={personalDetails.jobTitle} 
            fieldId="personalDetails.jobTitle" 
            onFocus={onFocus} 
            className="text-2xl font-light mt-2 block" 
            style={{...titleStyle, color: readableAccent(themeColor)}}
            tagName="p"
            placeholder="Job Title"
          />
        </header>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 border-b-4 border-gray-200 pb-2 mb-4 uppercase" style={titleStyle}>
            <InlineEdit value={sectionTitles?.profile || 'Profile'} fieldId="sectionTitles.profile" onFocus={onFocus} placeholder="Profile" />
          </h2>
          <InlineEdit 
            value={professionalSummary} 
            fieldId="professionalSummary" 
            onFocus={onFocus} 
            className="text-sm leading-relaxed text-gray-700 block whitespace-pre-wrap"
            tagName="p"
            placeholder="Professional Summary..."
          />
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-800 border-b-4 border-gray-200 pb-2 mb-4 uppercase" style={titleStyle}>
            <InlineEdit value={sectionTitles?.experience || 'Experience'} fieldId="sectionTitles.experience" onFocus={onFocus} placeholder="Experience" />
          </h2>
          {employmentHistory.map((job, index) => (
            <div key={job.id} className="mb-6 relative pl-6" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
               <div className="absolute left-0 top-1 w-3 h-3 bg-gray-800 rounded-full border-2 border-white" style={{backgroundColor: themeColor, color: inkOn(themeColor)}}></div>
               <div className="absolute left-[5px] top-4 h-full w-px bg-gray-200"></div>
              <div className="flex gap-1 text-xs font-bold text-gray-600 mb-1">
                  <InlineEdit value={job.startDate} fieldId={`employmentHistory[${index}].startDate`} onFocus={onFocus} placeholder="Start" />
                  <span>-</span>
                  <InlineEdit value={job.endDate} fieldId={`employmentHistory[${index}].endDate`} onFocus={onFocus} placeholder="End" />
              </div>
              <InlineEdit 
                value={job.jobTitle} 
                fieldId={`employmentHistory[${index}].jobTitle`} 
                onFocus={onFocus} 
                className="text-lg font-bold text-gray-900 block" 
                style={titleStyle}
                tagName="h3"
                placeholder="Job Title"
              />
              <div className="flex gap-1 text-md italic text-gray-700 mb-2">
                  <InlineEdit value={job.employer} fieldId={`employmentHistory[${index}].employer`} onFocus={onFocus} placeholder="Employer" />
                  <span>,</span>
                  <InlineEdit value={job.city} fieldId={`employmentHistory[${index}].city`} onFocus={onFocus} placeholder="City" />
              </div>
              <InlineEdit 
                value={job.description} 
                fieldId={`employmentHistory[${index}].description`} 
                onFocus={onFocus} 
                className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap block"
                tagName="p"
                placeholder="Description..."
              />
            </div>
          ))}
        </section>
      </main>
    </div>
  );
};