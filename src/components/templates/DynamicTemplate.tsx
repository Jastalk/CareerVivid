
import React from 'react';
import { ResumeData, TemplateProps } from '../../types';
import { Mail, Phone, MapPin } from 'lucide-react';
import InlineEdit from '../InlineEdit';

export const DynamicTemplate: React.FC<TemplateProps> = ({ resume, themeColor, titleFont, bodyFont, onFocus }) => {
  const { personalDetails, professionalSummary, employmentHistory, education, skills } = resume;

  const titleStyle = { fontFamily: `'${titleFont}', sans-serif` };
  const bodyStyle = { fontFamily: `'${bodyFont}', sans-serif` };

  return (
    <div className="bg-white text-gray-800 relative" style={bodyStyle}>
      <div className="absolute top-0 right-0 h-full w-1/3 bg-gray-100 -z-1" style={{clipPath: 'polygon(20% 0, 100% 0, 100% 100%, 0% 100%)'}}></div>
      <div className="p-8">
        <main className="flex gap-8 items-start">
            <div className="w-2/3">
                <section className="mb-6">
                    <h3 className="text-xl font-bold mb-2" style={titleStyle}>Summary</h3>
                    <InlineEdit 
                        value={professionalSummary} 
                        fieldId="professionalSummary" 
                        onFocus={onFocus} 
                        className="text-sm leading-relaxed block whitespace-pre-wrap"
                        tagName="p"
                        placeholder="Summary..."
                    />
                </section>
                 <section>
                    <h3 className="text-xl font-bold mb-3" style={titleStyle}>Experience</h3>
                    {employmentHistory.map((job, index) => (
                        <div key={job.id} className="mb-4">
                        <InlineEdit 
                            value={job.jobTitle} 
                            fieldId={`employmentHistory[${index}].jobTitle`} 
                            onFocus={onFocus} 
                            className="text-lg font-semibold block" 
                            style={titleStyle}
                            tagName="h4"
                            placeholder="Job Title"
                        />
                        <div className="flex justify-between text-sm mb-1">
                            <InlineEdit value={job.employer} fieldId={`employmentHistory[${index}].employer`} onFocus={onFocus} placeholder="Employer" className="italic text-gray-700" />
                            <div className="flex gap-1 text-gray-500">
                                <InlineEdit value={job.startDate} fieldId={`employmentHistory[${index}].startDate`} onFocus={onFocus} placeholder="Start" />
                                <span>-</span>
                                <InlineEdit value={job.endDate} fieldId={`employmentHistory[${index}].endDate`} onFocus={onFocus} placeholder="End" />
                            </div>
                        </div>
                        <InlineEdit 
                            value={job.description} 
                            fieldId={`employmentHistory[${index}].description`} 
                            onFocus={onFocus} 
                            className="text-sm whitespace-pre-wrap block"
                            tagName="p"
                            placeholder="Description..."
                        />
                        </div>
                    ))}
                </section>
            </div>
            <div className="w-1/3">
                 <header className="mb-8 text-right">
                    <div className="flex justify-end gap-2 flex-wrap">
                        <InlineEdit 
                            value={personalDetails.firstName} 
                            fieldId="personalDetails.firstName" 
                            onFocus={onFocus} 
                            className="text-5xl font-extrabold" 
                            style={titleStyle}
                            tagName="h1"
                            placeholder="First Name"
                        />
                        <InlineEdit 
                            value={personalDetails.lastName} 
                            fieldId="personalDetails.lastName" 
                            onFocus={onFocus} 
                            className="text-5xl font-extrabold" 
                            style={titleStyle}
                            tagName="h1"
                            placeholder="Last Name"
                        />
                    </div>
                    <InlineEdit 
                        value={personalDetails.jobTitle} 
                        fieldId="personalDetails.jobTitle" 
                        onFocus={onFocus} 
                        className="text-2xl font-light block mt-1" 
                        style={{...titleStyle, color: themeColor}}
                        tagName="h2"
                        placeholder="Job Title"
                    />
                </header>
                <aside>
                    <section className="mb-6">
                        <h3 className="text-lg font-bold mb-2 text-right" style={titleStyle}>Contact</h3>
                         <div className="space-y-2 text-sm">
                            {personalDetails.email && <div className="flex items-center justify-end"><InlineEdit value={personalDetails.email} fieldId="personalDetails.email" onFocus={onFocus} placeholder="Email" className="text-right" /><Mail size={14} className="ml-2 flex-shrink-0 transform translate-y-px" /></div>}
                            {personalDetails.phone && <div className="flex items-center justify-end"><InlineEdit value={personalDetails.phone} fieldId="personalDetails.phone" onFocus={onFocus} placeholder="Phone" /><Phone size={14} className="ml-2 flex-shrink-0 transform translate-y-px" /></div>}
                            {personalDetails.address && <div className="flex items-center justify-end"><InlineEdit value={personalDetails.address} fieldId="personalDetails.address" onFocus={onFocus} placeholder="Address" className="text-right" /><MapPin size={14} className="ml-2 flex-shrink-0 transform translate-y-px" /></div>}
                        </div>
                    </section>
                    <section className="mb-6 text-right">
                        <h3 className="text-lg font-bold mb-2" style={titleStyle}>Skills</h3>
                        <ul className="text-sm space-y-1 flex flex-col items-end">
                            {skills.map((skill, index) => (
                                <li key={skill.id}>
                                    <InlineEdit value={skill.name} fieldId={`skills[${index}].name`} onFocus={onFocus} placeholder="Skill" />
                                </li>
                            ))}
                        </ul>
                    </section>
                    <section className="text-right">
                        <h3 className="text-lg font-bold mb-2" style={titleStyle}>Education</h3>
                         {education.map((edu, index) => (
                            <div key={edu.id} className="mb-2">
                            <InlineEdit 
                                value={edu.degree} 
                                fieldId={`education[${index}].degree`} 
                                onFocus={onFocus} 
                                className="font-semibold text-sm block" 
                                style={titleStyle}
                                tagName="h4"
                                placeholder="Degree"
                            />
                            <InlineEdit 
                                value={edu.school} 
                                fieldId={`education[${index}].school`} 
                                onFocus={onFocus} 
                                className="text-xs italic block" 
                                tagName="p"
                                placeholder="School"
                            />
                            </div>
                        ))}
                    </section>
                </aside>
            </div>
        </main>
      </div>
    </div>
  );
};
